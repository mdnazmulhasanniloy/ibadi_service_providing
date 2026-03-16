import type { TGenericErrorResponse } from "@app/interface/error.js";

 

const handlePrismaValidationError = (err: any): TGenericErrorResponse => {
  const errorSources = [
    {
      path: '',
      message: err.message.split('\n').pop() || 'Validation error',
    },
  ];

  return {
    statusCode: 400,
    message: 'Validation Error',
    errorSources,
  };
};

export default handlePrismaValidationError;
