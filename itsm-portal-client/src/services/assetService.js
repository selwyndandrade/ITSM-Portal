import api from './api'

const API_URL = '/api/assets'

export const getAssets = async (params = {}) => {
  const response = await api.get(API_URL, { params })
  return response.data
}

export const getAsset = async (id) => {
  const response = await api.get(`${API_URL}/${id}`)
  return response.data
}

export const createAsset = async (payload) => {
  const response = await api.post(API_URL, payload)
  return response.data
}

export const updateAsset = async (id, payload) => {
  const response = await api.put(`${API_URL}/${id}`, payload)
  return response.data
}

export const deleteAsset = async (id) => {
  const response = await api.delete(`${API_URL}/${id}`)
  return response.data
}

export const getAssetHistory = async (id) => {
  const response = await api.get(`${API_URL}/${id}/history`)
  return response.data
}

export const assignAsset = async (id, payload) => {
  const response = await api.post(`${API_URL}/${id}/assign`, payload)
  return response.data
}

export default { getAssets, getAsset, createAsset, updateAsset, deleteAsset, getAssetHistory, assignAsset }
