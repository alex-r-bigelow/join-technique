/* globals onmessage:true */
/* exported onmessage */
let PAUSED = false;
let currentGlobalIndex = 0;

onmessage = function (m) {
  PAUSED = !!m.pause;
};
