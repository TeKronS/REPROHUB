'use server';

import CloudConvert from 'cloudconvert';

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY || '');

export async function convertPdfToDocx(formData: FormData) {
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new Error('No se ha proporcionado ningún archivo');
  }

  if (!process.env.CLOUDCONVERT_API_KEY) {
    throw new Error('API Key de CloudConvert no configurada. Por favor, añádela a tu archivo .env');
  }

  try {
    // Creamos el trabajo de conversión
    const job = await cloudConvert.jobs.create({
      tasks: {
        'import-my-file': {
          operation: 'import/upload',
        },
        'convert-my-file': {
          operation: 'convert',
          input: 'import-my-file',
          output_format: 'docx',
          // Eliminamos el motor específico para evitar el error 422 si no está disponible
          // CloudConvert usará el mejor motor por defecto para docx
        },
        'export-my-file': {
          operation: 'export/url',
          input: 'convert-my-file',
        },
      },
    });

    const uploadTask = job.tasks.filter(task => task.operation === 'import/upload')[0];
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Subimos el archivo a la tarea de importación
    await cloudConvert.tasks.upload(uploadTask, buffer, file.name);

    // Esperamos a que el trabajo termine (polling)
    const finishedJob = await cloudConvert.jobs.wait(job.id!);
    
    // Verificamos si hubo errores en alguna tarea
    const failedTask = finishedJob.tasks.find(task => task.status === 'error');
    if (failedTask) {
      throw new Error(`Error en la tarea ${failedTask.operation}: ${failedTask.message || 'Desconocido'}`);
    }

    const exportTask = finishedJob.tasks.find(task => task.operation === 'export/url' && task.status === 'finished');
    
    if (!exportTask || !exportTask.result || !exportTask.result.files || exportTask.result.files.length === 0) {
      throw new Error('La exportación del archivo falló o no devolvió resultados');
    }

    return {
      url: exportTask.result.files[0].url,
      name: exportTask.result.files[0].filename
    };
  } catch (error: any) {
    // Intentamos extraer el mensaje de error detallado de la respuesta de la API
    const detail = error.response?.data?.message || error.message;
    console.error('CloudConvert API Error:', detail);
    throw new Error(`Error CloudConvert: ${detail}`);
  }
}
