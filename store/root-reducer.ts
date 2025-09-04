import { combineReducers } from '@reduxjs/toolkit';
import uiReducer from './slices/ui-slice';

export const rootReducer = combineReducers({
    ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;