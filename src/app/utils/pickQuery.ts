import { paginationFields } from '@app/constants/pagination.js';
import pick from './pick.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pickQuery = async (query: Record<string, any>) => {
  const paginationOptions = await pick(query, paginationFields);

  const filters = await Object.fromEntries(
    Object.entries(query).filter(
      ([key, value]) =>
        !paginationFields.includes(key) && value != null && value !== '',
    ),
  );

  return {
    pagination: paginationOptions,
    filters,
  };
};

export default pickQuery;
