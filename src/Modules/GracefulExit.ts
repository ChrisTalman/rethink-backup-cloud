'use strict';

// Internal Modules
import { timerStore } from 'src/Modules/TimerStore';

export function handleGracefulExit()
{
	timerStore.clear();
};