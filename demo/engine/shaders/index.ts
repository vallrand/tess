export const shaders = {
    batch_vert: <string> require('./batch_vert.glsl'),
    batch_frag: <string> require('./batch_frag.glsl'),
    stripe_vert: <string> require('./stripe_vert.glsl'),
    billboard_vert: <string> require('./billboard_vert.glsl'),
    billboard_frag: <string> require('./billboard_frag.glsl'),
    decal_vert: <string> require('./decal_vert.glsl'),
    decal_frag: <string> require('./decal_frag.glsl'),
    particle_vert: <string> require('./particle_vert.glsl'),
    fullscreen_vert: <string> require('./fullscreen_vert.glsl'),
    geometry_vert: <string> require('./geometry_vert.glsl'),
    geometry_frag: <string> require('./geometry_frag.glsl'),
    noise_frag: <string> require('./noise_frag.glsl')
}