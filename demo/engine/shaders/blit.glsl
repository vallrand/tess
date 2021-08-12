#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uSampler;
uniform vec4 uMask;

void main(){
#ifdef NEAREST
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    fragColor = uMask * texelFetch(uSampler, fragCoord, 0);
#else
    fragColor = uMask * texture(uSampler, vUV);
#endif
}