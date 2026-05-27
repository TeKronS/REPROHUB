
'use server';

import CloudConvert from 'cloudconvert';

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY || '');

export async function convertPdfToDocx(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  if (!process.env.CLOUDCONVERT_API_KEY) {
    throw new Error('API Key de CloudConvert no configurada. Por favor, añádela a .env');
  }

  try {
    const job = await cloudConvert.jobs.create({
      tasks: {
        'import-my-file': {
          operation: 'import/upload',
        },
        'convert-my-file': {
          operation: 'convert',
          input: 'import-my-file',
          output_format: 'docx',
          engine: 'officeguide', // Motor de alta calidad para preservar diseño
        },
        'export-my-file': {
          operation: 'export/url',
          input: 'convert-my-file',
        },
      },
    });

    const uploadTask = job.tasks.filter(task => task.operation === 'import/upload')[0];
    const buffer = Buffer.from(await file.arrayBuffer());
    
    await cloudConvert.tasks.upload(uploadTask, buffer, file.name);

    // Esperar a que el trabajo termine (poll)
    let finishedJob = await cloudConvert.jobs.wait(job.id!);
    
    const exportTask = finishedJob.tasks.filter(task => task.operation === 'export/url' && task.status === 'finished')[0];
    
    if (!exportTask || !exportTask.result || !exportTask.result.files) {
      throw new Error('La exportación falló');
    }

    return {
      url: exportTask.result.files[0].url,
      name: exportTask.result.files[0].filename
    };
  } catch (error: any) {
    console.error('CloudConvert Error:', error);
    throw new Error(error.message || 'Error en la conversión remota');
  }
}
