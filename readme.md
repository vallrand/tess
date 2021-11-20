# TESS

[![github-pages Status](https://github.com/vallrand/tess/workflows/github-pages/badge.svg)](https://github.com/vallrand/tess/actions)

Turn Based Strategy. WebGL 2 / 3D Deferred / TypeScript Demo.

[Demo](http://vallrand.github.io/tess/index.html)

### Build

```sh
npm install
npm run build
npm run start
#open browser http://127.0.0.1:9000?debug
```

## Deferred Renderer Format

| Buffer | Channel | Format | Description |
| ------ | ------ | ------ | ------ |
| Position | RGB | HALF_FLOAT | Fragment position in Camera View space |
| Position | A | HALF_FLOAT | Object Layer ID |
| Normal | RGB | HALF_FLOAT | Fragment normal in World space |
| Normal | A | HALF_FLOAT | Material metalness |
| Albedo | RGB | UNSIGNED_BYTE | Albedo |
| Albedo | A | UNSIGNED_BYTE | Emission / Roughness |


| Pass | Input | Output | Description |
| ------ | ------ | ------ | ------ |
| Geometry | - | Position/Normal/Albedo | Solid Geometry - Static/Skinned, SkyBox |
| Decal | Position/Depth | Normal/Albedo |  |
| Ambient Light | Position/Normal/Albedo | Color | Environment Diffuse + Reflection Probes |
| Lighting | Position/Normal/Albedo | Color | Point Light Sources |
| Particles | - | Color | Particle Effects |
| Post Effects | Color | Color | Displacement/Bloom/Fog/etc |
| Overlay | - | Color | User Interface |

#### Model Texture Format

| Channel | Description |
| ------ | ------ |
| R | Material Index |
| G | Prebaked Ambient Occlusion |
| B | Bump Map Height |

## References

- [Wave Function Collapse](https://github.com/mxgmn/WaveFunctionCollapse)
- [Poisson Disk Sampling](https://github.com/kchapelier/poisson-disk-sampling)
- [A* Search Algorithm](https://github.com/bgrins/javascript-astar)
- [Tileable Noise](https://github.com/tuxalin/procedural-tileable-shaders) [4D Noise](https://www.gamedev.net/forums/topic/642794-tileable-fbm-noise/)
- [Screen Space Decals](https://martindevans.me/game-development/2015/02/27/Drawing-Stuff-On-Other-Stuff-With-Deferred-Screenspace-Decals/)
- [Image Based Lightning](https://learnopengl.com/PBR/IBL/Specular-IBL) [PBR](https://www.jordanstevenstechart.com/physically-based-rendering) [Specular BRDF](http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html)
- [Cantor Pairing Function](https://en.wikipedia.org/wiki/Pairing_function) [Line Drawing](https://www.redblobgames.com/grids/line-drawing.html)
- [Cubemap Blending](https://seblagarde.wordpress.com/2012/09/29/image-based-lighting-approaches-and-parallax-corrected-cubemap/)
- [Vertex Data Packing](https://dev.to/keaukraine/optimization-of-opengl-es-vertex-data-15d0)
- [Derivative Maps](https://www.rorydriscoll.com/2012/01/11/derivative-maps/) [Derivative Maps vs Normal Maps](https://computergraphics.stackexchange.com/questions/4937/derivative-maps-vs-tangent-space-normal-maps) [Bump Mapping](https://apoorvaj.io/exploring-bump-mapping-with-webgl/)
- [Frustum Culling](http://www.lighthouse3d.com/tutorials/view-frustum-culling/)
- [VFX Master Shader](https://halisavakis.com/my-take-on-shaders-vfx-master-shader-part-iii/) [Post Effects](https://lettier.github.io/3d-game-shaders-for-beginners/index.html) [Bloom](https://learnopengl.com/Advanced-Lighting/Bloom) [Screen Space Distortion](http://kylehalladay.com/blog/tutorial/2016/01/15/Screen-Space-Distortion.html)
- [Transparency Sorting](https://csawesome.runestone.academy/runestone/books/published/learnwebgl2/12_advanced_rendering/04_transparency.html) [Billboards](https://www.flipcode.com/archives/Billboarding-Excerpt_From_iReal-Time_Renderingi_2E.shtml)
- [FABRIK IK](http://www.andreasaristidou.com/FABRIK.html) [CCD IK](https://sites.google.com/site/auraliusproject/ccd-algorithm)
- [Orthonormal Basis](https://graphics.pixar.com/library/OrthonormalB/paper.pdf) [Perpendicular Vectors](https://blog.selfshadow.com/2011/10/17/perp-vectors/)
- [Swing Twist Decomposition](http://allenchou.net/2018/05/game-math-swing-twist-interpolation-sterp/) [Quaternions](https://gabormakesgames.com/blog_quats_interpolate.html)
- [Influence Maps](https://www.gamedev.net/articles/programming/artificial-intelligence/the-core-mechanics-of-influence-mapping-r2799/)
- [HalfSpace Fog](http://www.terathon.com/lengyel/Lengyel-UnifiedFog.pdf)
- [Signed Distance Functions](https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm)
- Shaders: [Wang Tiles](https://www.shadertoy.com/view/Wds3z7) [Dunes](https://www.shadertoy.com/view/ld3BzM) [Sky](https://www.shadertoy.com/view/lt2SR1) [Gold](https://www.shadertoy.com/view/XtcfRn) [Voronoi circuit](https://www.shadertoy.com/view/tddXWH) [Hatching](https://www.shadertoy.com/view/4lfXDM) [Sine Noise](https://www.shadertoy.com/view/llcXW7) [Fractal](https://www.shadertoy.com/view/XlX3Rj) [Murmur Hash](https://gist.github.com/mpottinger/54d99732d4831d8137d178b4a6007d1a)
