import { ValidateIf } from 'class-validator';

export const CanBeUndefined = () =>
  ValidateIf((object, value) => value !== undefined);
