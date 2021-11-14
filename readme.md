# TESS

[![github-pages Status](https://github.com/vallrand/tess/workflows/github-pages/badge.svg)](https://github.com/vallrand/tess/actions)

Turn Based Strategy. WebGL 2 / 3D / TypeScript Demo.

[Demo](http://vallrand.github.io/tess/index.html)

### Build
```sh
npm install
#development
npm run start
#production
npm run build
#open browser http://127.0.0.1:9000?debug
```

## Data Format



## References

- [Wave Function Collapse](https://github.com/mxgmn/WaveFunctionCollapse)
- [Poisson Disk Sampling](https://github.com/kchapelier/poisson-disk-sampling)
- [A* Search Algorithm](https://github.com/bgrins/javascript-astar)
- [Tileable Noise](https://github.com/tuxalin/procedural-tileable-shaders)
- [Screen Space Decals](https://martindevans.me/game-development/2015/02/27/Drawing-Stuff-On-Other-Stuff-With-Deferred-Screenspace-Decals/)
- [Screen Space Distortion](http://kylehalladay.com/blog/tutorial/2016/01/15/Screen-Space-Distortion.html)
- [Image Based Lightning](https://learnopengl.com/PBR/IBL/Specular-IBL)
- [Bloom](https://learnopengl.com/Advanced-Lighting/Bloom)
- [Line Drawing](https://www.redblobgames.com/grids/line-drawing.html)
- [Random Floodfill](https://www.redblobgames.com/x/1521-randomized-fill/)
- [Cantor Pairing Function](https://en.wikipedia.org/wiki/Pairing_function)
- [Cubemap Blending](https://seblagarde.wordpress.com/2012/09/29/image-based-lighting-approaches-and-parallax-corrected-cubemap/)
- [Vertex Data Packing](https://dev.to/keaukraine/optimization-of-opengl-es-vertex-data-15d0)
- [Derivative Maps](https://www.rorydriscoll.com/2012/01/11/derivative-maps/)
- [Frustum Culling](http://www.lighthouse3d.com/tutorials/view-frustum-culling/)
- [VFX Master Shader](https://halisavakis.com/my-take-on-shaders-vfx-master-shader-part-iii/)
- [Specular BRDF](http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html)
- [PBR](https://www.jordanstevenstechart.com/physically-based-rendering)
- [Bump Mapping](https://apoorvaj.io/exploring-bump-mapping-with-webgl/)
- [Transparency Sorting](https://csawesome.runestone.academy/runestone/books/published/learnwebgl2/12_advanced_rendering/04_transparency.html)
- [FABRIK IK](http://www.andreasaristidou.com/FABRIK.html)
- [CCD IK](https://sites.google.com/site/auraliusproject/ccd-algorithm)
- [Orthonormal Basis](https://graphics.pixar.com/library/OrthonormalB/paper.pdf)
- [Perpendicular Vectors](https://blog.selfshadow.com/2011/10/17/perp-vectors/)
- [Swing Twist Quaternion Decomposition](http://allenchou.net/2018/05/game-math-swing-twist-interpolation-sterp/)
- [Influence Maps](https://www.gamedev.net/articles/programming/artificial-intelligence/the-core-mechanics-of-influence-mapping-r2799/)
- [Billboards](https://www.flipcode.com/archives/Billboarding-Excerpt_From_iReal-Time_Renderingi_2E.shtml)
- [HalfSpace Fog](http://www.terathon.com/lengyel/Lengyel-UnifiedFog.pdf)


cubic bezier ease https://cubic-bezier.com/#.17,.67,.83,.67
optimization https://emscripten.org/docs/optimizing/Optimizing-WebGL.html
webgl state https://webgl2fundamentals.org/webgl/lessons/resources/webgl-state-diagram.html

particles = 
https://gpfault.net/posts/webgl2-particles.txt.html
https://www.youtube.com/watch?v=PWjIeJDE7Rc
https://www.youtube.com/watch?v=OYYZQ1yiXOE
https://www.youtube.com/watch?v=tYiScgHXcXQ last
PBR = 
https://gist.github.com/xDavidLeon/38b392700fbec56162ba
https://learnopengl.com/PBR/Theory

https://gist.github.com/galek/53557375251e1a942dfa
https://github.com/Nadrin/PBR/blob/master/data/shaders/glsl/pbr_fs.glsl
https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/source/shaders/ibl_filtering.frag
https://lettier.github.io/3d-game-shaders-for-beginners/fresnel-factor.html
https://github.com/ykob/glsl-bloom/tree/master/src




https://github.com/tsherif/webgl2examples/blob/master/deferred.html
https://github.com/crebstar/WebGLDR/tree/DeferredRenderer/XAMPP/htdocs
https://github.com/dlubarov/webgl-infinite-terrain-demo/blob/master/terrain.js
https://stackoverflow.com/questions/44629165/bind-multiple-uniform-buffer-objects


https://www.shadertoy.com/view/ld3BzM //sand dunes

https://computergraphics.stackexchange.com/questions/4937/derivative-maps-vs-tangent-space-normal-maps
https://github.com/buildaworldnet/IrrlichtBAW/wiki/How-to-Normal-Detail-Bump-Derivative-Map,-why-Mikkelsen-is-slightly-wrong-and-why-you-should-give-up-on-calculating-per-vertex-tangents
https://stackoverflow.com/questions/51988629/bump-mapping-with-javascript-and-glsl

https://www.shadertoy.com/view/Xt3cDn
https://www.shadertoy.com/view/Ws3GRs - rectangular tiling
https://www.shadertoy.com/view/3sdcWH - rectangular tiling 2
https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm - SDF 2D
https://www.shadertoy.com/view/4sc3z2 - noises

ground fog https://stackoverflow.com/questions/21549456/how-to-implement-a-ground-fog-glsl-shader
unity shaders https://github.com/jraleman/marstronics/tree/master/Unity%20Project/Assets/Standard%20Assets/Effects


view ray frustum shader https://community.khronos.org/t/ray-origin-through-view-and-projection-matrices/72579
https://gamedev.stackexchange.com/questions/60313/implementing-a-skybox-with-glsl-version-330
https://stackoverflow.com/questions/2354821/raycasting-how-to-properly-apply-a-projection-matrix
sky https://www.shadertoy.com/view/lt2SR1

normal matrix https://www.lighthouse3d.com/tutorials/glsl-12-tutorial/the-normal-matrix/
https://stackoverflow.com/questions/27600045/the-correct-way-to-calculate-normal-matrix
https://www.gamedev.net/forums/topic/648782-normals-in-world-space-from-a-glsl-shader/
linear depth https://gist.github.com/kovrov/a26227aeadde77b78092b8a962bd1a91
linear depth2 https://learnopengl.com/Advanced-OpenGL/Depth-testing
recover depth https://stackoverflow.com/questions/11277501/how-to-recover-view-space-position-given-view-space-depth-value-and-ndc-xy/46118945#46118945

fire ring https://www.shadertoy.com/view/tslSDX
glow lines https://www.shadertoy.com/user/remonvv

gold //https://www.shadertoy.com/view/XtcfRn
//https://www.shadertoy.com/view/4tSGW3

circuit
https://www.shadertoy.com/view/ttVfzR
https://www.shadertoy.com/view/Wds3z7
https://www.shadertoy.com/view/tddXWH
https://www.shadertoy.com/view/4dVBzz
https://www.gamedev.net/forums/topic/642794-tileable-fbm-noise/
https://www.shadertoy.com/view/4lfXDM
foamy water https://www.shadertoy.com/view/llcXW7
circuits fractal https://www.shadertoy.com/view/XlX3Rj

hashes https://gist.github.com/mpottinger/54d99732d4831d8137d178b4a6007d1a
billboards https://forum.unity.com/threads/billboard-script-flat-spherical-arbitrary-axis-aligned.539481/
billboard line https://community.khronos.org/t/billboarded-line/37173

align billboards https://www.gamedev.net/forums/topic/696694-stretched-billboard-projected-particles/
align billboards2 https://gamedev.stackexchange.com/questions/38695/billboarding-aligning-with-velocity-direction


quats https://gabormakesgames.com/blog_quats_interpolate.html
quat decompose https://stackoverflow.com/questions/3684269/component-of-a-quaternion-rotation-around-an-axis