import catchAsync from '@app/utils/catchAsync.js';
import { favoritesService } from './favorites.service.js';
import sendResponse from '@app/utils/sendResponse.js';
import httpStatus from 'http-status';

// ======================================================
// 🔥 Favorites Controller
// ======================================================
export const favoritesController = {
  createFavorites: catchAsync(async (req, res) => {
    const body = {
      ...req.body,
      userId: req.user.userId,
    };
    const result = await favoritesService.createFavorites(body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Favorites created successfully',
      data: result,
    });
  }),

  getAllFavorites: catchAsync(async (req, res) => {
    const query = {
      ...req.query,
      userId: req.user.userId,
    };
    const result = await favoritesService.getAllFavorites(query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All favorites fetched successfully',
      data: result,
    });
  }),

  getFavoritesById: catchAsync(async (req, res) => {
    const result = await favoritesService.getFavoritesById(
      req.params.id as string,
      req.query?.include,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Favorites fetched successfully',
      data: result,
    });
  }),

  updateFavorites: catchAsync(async (req, res) => {
    const result = await favoritesService.updateFavorites(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Favorites updated successfully',
      data: result,
    });
  }),

  deleteFavorites: catchAsync(async (req, res) => {
    const result = await favoritesService.deleteFavorites(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Favorites deleted successfully',
      data: result,
    });
  }),
};
