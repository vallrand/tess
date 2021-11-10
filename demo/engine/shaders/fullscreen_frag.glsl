#pragma import(./template/fullscreen_frag.glsl)

#ifdef CUBEMAP
uniform samplerCube uSampler;
#else
uniform sampler2D uSampler;
#endif
uniform vec4 uMask;

#define TAU 6.283185307179586

void main(){
#ifdef CUBEMAP
    vec2 uv = vUV * vec2(TAU,.5*TAU);
    vec3 ray = vec3(
       -sin(uv.x) * sin(uv.y),
       -cos(uv.y),
       -cos(uv.x) * sin(uv.y)
    );
    fragColor = texture(uSampler, ray);
#else
#ifdef NEAREST
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    fragColor = uMask * texelFetch(uSampler, fragCoord, 0);
#else
    fragColor = uMask * texture(uSampler, vUV);
#endif
#endif
}