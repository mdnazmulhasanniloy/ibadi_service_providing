import type { TErrorSources, TGenericErrorResponse } from '@app/interface/error.js';
import { ZodError, type ZodIssue } from 'zod'; 


const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSources = err.issues.map((issue: ZodIssue) => {
    const path = issue.path[issue.path.length - 1];

    return {
      path: typeof path === 'string' || typeof path === 'number' ? path : null,
      message: issue.message,
    };
  });

  const statusCode = 400;

  return {
    statusCode,
    message: 'Validation Error',
    errorSources,
  };
};


 

export default handleZodError;
