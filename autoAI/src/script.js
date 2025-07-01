import request from '@/utils/request';export function getOtaOverview(params) {
  return request({
    url: '/bigscreen/countOtaNum',
    method: 'get',
    params
  });
}