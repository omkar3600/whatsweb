import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface UseAsyncActionOptions<TData = unknown> {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export function useAsyncAction<
  TArgs extends unknown[],
  TResult
>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions<TResult> = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await action(...args);
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      if (options.errorMessage !== null) {
        toast.error(options.errorMessage || errorObj.message);
      }
      if (options.onError) {
        options.onError(errorObj);
      }
      throw errorObj;
    } finally {
      setLoading(false);
    }
  }, [action, loading, options]);

  return { execute, loading, error };
}
