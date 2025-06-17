import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { handleApiError } from './endpoints'; 

if (error.response?.data?.status === 'error') {
  return Promise.reject(new ApiError(
    (error.response.data as any).data,
    'API_ERROR',
    error.response.status
  ));
} 