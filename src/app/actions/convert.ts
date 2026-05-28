'use server';

import CloudConvert from 'cloudconvert';

const apiKey = process.env.CLOUDCONVERT_API_KEY || '';

/**
 * Inicia el trabajo de conversión en CloudConvert y sube el archivo.
 * Retorna el ID del trabajo para que el cliente pueda consultar su progreso.
 */
export async function startPdfConversion(formData: FormData) {
  if (!apiKey) {
    throw new Error('API Key de CloudConvert no configurada en las variables de entorno.');
  }

  const file = formData.get('file') as File;
  if (!file) {
    throw new Error('No se ha proporcionado ningún archivo.');
  }

  const cloudConvert = new CloudConvert(apiKey);

  try {
    // Creamos el trabajo de conversión con tres tareas: importación, conversión y exportación
    const job = await cloudConvert.jobs.create({
      tasks: {
        'import-my-file': {
          operation: 'import/upload',
        },
        'convert-my-file': {
          operation: 'convert',
          input: 'import-my-file',
          output_format: 'docx',
        },
        'export-my-file': {
          operation: 'export/url',
          input: 'convert-my-file',
        },
      },
    });

    const uploadTask = job.tasks.find(task => task.operation === 'import/upload');
    if (!uploadTask) throw new Error('No se pudo inicializar la tarea de subida.');

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Subimos el archivo a CloudConvert
    await cloudConvert.tasks.upload(uploadTask, buffer, file.name);

    return { jobId: job.id };
  } catch (error: any) {
    console.error('Error al iniciar CloudConvert:', error.message);
    throw new Error(`Error al iniciar conversión: ${error.message}`);
  }
}

/**
 * Consulta el estado actual de un trabajo de CloudConvert.
 */
export async function getJobStatus(jobId: string) {
  if (!apiKey) throw new Error('API Key no configurada.');
  const cloudConvert = new CloudConvert(apiKey);
  
  try {
    const job = await cloudConvert.jobs.get(jobId);
    
    // Verificar si alguna tarea falló
    const failedTask = job.tasks.find(task => task.status === 'error');
    if (failedTask) {
      return { 
        status: 'error', 
        message: failedTask.message || 'Ocurrió un error técnico durante la conversión.' 
      };
    }

    // Verificar si el archivo ya está listo para descargar
    const exportTask = job.tasks.find(task => task.operation === 'export/url' && task.status === 'finished');
    if (exportTask && exportTask.result && exportTask.result.files && exportTask.result.files.length > 0) {
      return { 
        status: 'finished', 
        url: exportTask.result.files[0].url, 
        name: exportTask.result.files[0].filename 
      };
    }

    // Calcular progreso basado en tareas completadas
    const totalTasks = job.tasks.length;
    const finishedTasks = job.tasks.filter(t => t.status === 'finished').length;
    const progress = Math.min(95, Math.round((finishedTasks / totalTasks) * 100));

    return { 
      status: job.status, 
      progress 
    };
  } catch (error: any) {
    console.error('Error al consultar estado:', error.message);
    return { status: 'error', message: 'No se pudo obtener el estado del servidor.' };
  }
}
