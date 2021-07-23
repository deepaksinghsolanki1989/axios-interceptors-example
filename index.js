import axios from 'axios';
import Cookies from 'js-cookie';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('access-token')}` });

const client = axios.create({
  baseURL: API_ENDPOINT,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

class ApiService {
  static get(path = '') {
    return client({
      method: 'GET',
      url: path,
      headers: {
        ...authHeader(),
      },
    });
  }

  static post(path = '', data = {}, optionalHeader = {}) {
    return client({
      method: 'POST',
      url: path,
      data: JSON.stringify(data),
      headers: {
        ...authHeader(),
        ...optionalHeader,
      },
    });
  }

  static patch(path = '', data = {}) {
    return client({
      method: 'PATCH',
      url: path,
      data: JSON.stringify(data),
      headers: {
        ...authHeader(),
      },
    });
  }

  static put(path = '', data = {}) {
    return client({
      method: 'PUT',
      url: path,
      data: JSON.stringify(data),
      headers: {
        ...authHeader(),
      },
    });
  }
}

let isRefreshing = false;
let refreshSubscribers = [];

/**
 * axios interceptors runs before and after a request, letting the developer modify req,req more
 * For more details on axios interceptor see https://github.com/axios/axios#interceptors
 */
// client.interceptors.request.use(config => {
//   // do something before executing the request For example tag along the bearer
//   // access token to request header or set a cookie
//   const requestConfig = config;
//   const { headers } = config;

//   requestConfig.headers = {
//     ...headers,
//     Authorization: `Bearer ${Cookies.get('access-token')}`,
//   };

//   return requestConfig;
// });

client.interceptors.response.use(
  response => response,
  error => {
    const {
      config,
      response: { status },
    } = error;
    const originalRequest = config;

    if (status === 401 && originalRequest.url !== '/login' && originalRequest.url !== '/refresh-token') {
      if (!isRefreshing) {
        isRefreshing = true;

        const refresh = Cookies.get('refresh-token');

        ApiService.post('/refresh-token', { refresh })
          .then(response => {
            Cookies.set('access-token', response.data.access);

            isRefreshing = false;
            onRrefreshed(response.data.access);
          })
          .catch(error => {
            // dispatch(loginErr({ message: error.data.detail }));

            Cookies.remove('logedIn');
            Cookies.remove('access-token');
            Cookies.remove('refresh-token');
          });

        const retryOriginalRequest = new Promise(resolve => {
          subscribeTokenRefresh(token => {
            // replace the expired token and retry
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            resolve(axios(originalRequest));
          });
        });

        return retryOriginalRequest;
      }
    } else {
      return Promise.reject(error);
    }
  },
);

const subscribeTokenRefresh = cb => {
  refreshSubscribers.push(cb);
};

const onRrefreshed = token => {
  refreshSubscribers.map(cb => cb(token));
};

export { ApiService };
