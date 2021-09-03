# TESS

TODO:
decal system texturing/ alpha test
ring + cylinders for anticipation
expandin cracks
AOE decal/ burn decal?
lightning spritesheet + particle emitter
distortion wave

normal gun
path trace bullet + light
cone for muzzle flash





Particle effects:
* dust air static points
* grass static mesh
* wave oriented
* sparks - strip
* energy inward emitter
* explosion sphere
* 

## Data Format

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
https://www.jordanstevenstechart.com/physically-based-rendering
https://learnopengl.com/PBR/Theory
http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html
https://gist.github.com/galek/53557375251e1a942dfa
https://github.com/Nadrin/PBR/blob/master/data/shaders/glsl/pbr_fs.glsl
https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/source/shaders/ibl_filtering.frag
https://lettier.github.io/3d-game-shaders-for-beginners/fresnel-factor.html
blom - https://learnopengl.com/Advanced-Lighting/Bloom
https://github.com/ykob/glsl-bloom/tree/master/src

decals - https://martindevans.me/game-development/2015/02/27/Drawing-Stuff-On-Other-Stuff-With-Deferred-Screenspace-Decals/
https://bartwronski.com/2015/03/12/fixing-screen-space-deferred-decals/
https://mtnphil.wordpress.com/2014/05/24/decals-deferred-rendering/
https://gist.github.com/bshishov/3eaa056d1560584ff82c1b96ee2f20fd

https://iquilezles.org/www/articles/palettes/palettes.htm

unity master shader https://halisavakis.com/my-take-on-shaders-vfx-master-shader-part-iii/

https://github.com/tsherif/webgl2examples/blob/master/deferred.html
https://github.com/crebstar/WebGLDR/tree/DeferredRenderer/XAMPP/htdocs
https://github.com/keaukraine/webgl-dunes
https://github.com/dlubarov/webgl-infinite-terrain-demo/blob/master/terrain.js
https://stackoverflow.com/questions/44629165/bind-multiple-uniform-buffer-objects
http://www.lighthouse3d.com/tutorials/view-frustum-culling/
https://clockworkchilli.com/blog/6_procedural_textures_in_javascript
https://www.shadertoy.com/view/ld3BzM //sand dunes
https://apoorvaj.io/exploring-bump-mapping-with-webgl/
https://computergraphics.stackexchange.com/questions/4937/derivative-maps-vs-tangent-space-normal-maps
https://github.com/buildaworldnet/IrrlichtBAW/wiki/How-to-Normal-Detail-Bump-Derivative-Map,-why-Mikkelsen-is-slightly-wrong-and-why-you-should-give-up-on-calculating-per-vertex-tangents
https://www.rorydriscoll.com/2012/01/11/derivative-maps/
https://stackoverflow.com/questions/51988629/bump-mapping-with-javascript-and-glsl
https://dev.to/keaukraine/optimization-of-opengl-es-vertex-data-15d0

https://www.shadertoy.com/view/Xt3cDn
https://www.shadertoy.com/view/3sKXWh tileable textures

displacement http://kylehalladay.com/blog/tutorial/2016/01/15/Screen-Space-Distortion.html

normal matrix https://www.lighthouse3d.com/tutorials/glsl-12-tutorial/the-normal-matrix/
https://lxjk.github.io/2017/10/01/Stop-Using-Normal-Matrix.html
https://stackoverflow.com/questions/27600045/the-correct-way-to-calculate-normal-matrix
https://www.gamedev.net/forums/topic/648782-normals-in-world-space-from-a-glsl-shader/

circuit
https://www.shadertoy.com/view/ttVfzR
https://www.shadertoy.com/view/Wds3z7
https://www.shadertoy.com/view/tddXWH
https://www.shadertoy.com/view/4dVBzz
https://www.gamedev.net/forums/topic/642794-tileable-fbm-noise/
https://www.shadertoy.com/view/4lfXDM
foamy water https://www.shadertoy.com/view/llcXW7

transparency sorting https://csawesome.runestone.academy/runestone/books/published/learnwebgl2/12_advanced_rendering/04_transparency.html
hashes https://gist.github.com/mpottinger/54d99732d4831d8137d178b4a6007d1a
billboards https://forum.unity.com/threads/billboard-script-flat-spherical-arbitrary-axis-aligned.539481/
billboards https://www.flipcode.com/archives/Billboarding-Excerpt_From_iReal-Time_Renderingi_2E.shtml
billboard line https://community.khronos.org/t/billboarded-line/37173

align billboards https://www.gamedev.net/forums/topic/696694-stretched-billboard-projected-particles/
align billboards2 https://gamedev.stackexchange.com/questions/38695/billboarding-aligning-with-velocity-direction

VULKAN https://therealmjp.github.io/posts/bindless-texturing-for-deferred-rendering-and-decals/

bind gbuffer
render static geometry
render skinned geometry

bind lbuffer
render lights

final render
post effects



entity {
    transform
    geometry
    material
    behaviour
}


Application([
    Renderer,
    Updater,
    etc
])



action ->
execute -> next -> endTurn -> next -> end
next = wait for next 