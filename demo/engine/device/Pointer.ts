// window.addEventListener('mousemove', function(e) {
//     var dx, dy;
//     if (e.movementX != null) {
//       dx = e.movementX;
//       dy = e.movementY;
//     } else if (lastMouseX != null) {
//       dx = e.screenX - lastMouseX;
//       dy = e.screenY - lastMouseY;
//     } else {
//       dx = dy = 0;
//     }

//     tilt += 0.005 * dy;
//     tilt = Math.max(tilt, -Math.PI / 2);
//     tilt = Math.min(tilt, Math.PI / 2);
//     direction -= 0.005 * dx;

//     lastMouseX = e.screenX;
//     lastMouseY = e.screenY;
//   });

//   canvas.addEventListener("click", function(e) {
//     canvas.requestPointerLock();
//   });