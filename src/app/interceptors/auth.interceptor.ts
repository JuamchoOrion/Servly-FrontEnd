import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Clonar la petición para agregar withCredentials
  const authReq = req.clone({
    withCredentials: true  // Permite enviar/recibir cookies
  });

  return next(authReq);
};
