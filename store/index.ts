import { configureStore } from '@reduxjs/toolkit';
import {rootReducer} from './root-reducer';

export const store = configureStore({
    reducer: rootReducer,
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];