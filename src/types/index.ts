/**
 * Global Type Definitions
 * Central export for all shared types
 */

// Re-export all schema types
export * from '../schemas/store';
export * from '../schemas/product';
export * from '../schemas/category';
export * from '../schemas/admin';
export * from '../schemas/subscription';
export * from '../schemas/order';
export * from '../schemas/payment';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// API Response wrapper types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form state types
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Loading state types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error: string | null;
}

// Event handler types
export type InputChangeHandler = React.ChangeEvent<HTMLInputElement>;
export type TextAreaChangeHandler = React.ChangeEvent<HTMLTextAreaElement>;
export type SelectChangeHandler = React.ChangeEvent<HTMLSelectElement>;
export type FormSubmitHandler = React.FormEvent<HTMLFormElement>;
export type ButtonClickHandler = React.MouseEvent<HTMLButtonElement>;
