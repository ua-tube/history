import { ValidateIf } from 'class-validator';

export const CanBeNull = () => ValidateIf((object, value) => value !== null);
