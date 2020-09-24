import axios from 'axios';

import Routes from './routes';

export const fetchToilets = (onSuccess, onError) => {
  axios
    .get(Routes.getToilets)
    .then((response) => {
      if (response.status === 200 && response.data.length > 0) {
        onSuccess(response.data);
      } else {
        console.log('ERROR COY');
      }
    })
    .catch(onError);
};

export const fetchToiletDetails = (id, onSuccess, onError) => {
  axios
    .get(`${Routes.getToilets}/${id}`)
    .then((res) => {
      if (res.status === 200) {
        onSuccess(res.data);
      } else {
        console.log('fetchToiletDetails: Something went wrong fetching data');
      }
    })
    .catch(onError);
};
