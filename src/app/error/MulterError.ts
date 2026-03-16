import type { TErrorSources, TGenericErrorResponse } from '@app/interface/error.js';
import { MulterError } from 'multer'; 

const handelMulterError = (err: MulterError): TGenericErrorResponse => {
  let errorSources: TErrorSources = [
    { path: '', message: 'File upload error' },
  ];
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      errorSources = [
        {
          path: err.code as string,
          message: 'File size is too large.',
        },
      ];
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      errorSources = [{ path: '', message: 'Too many files to upload.' }];
      break;
    default:
      errorSources = [{ path: '', message: err.message }];
      break;
  }

  const statusCode = 400;
  return { statusCode, message: 'Validation Error', errorSources };
};

export default handelMulterError;
