#version 300 es
precision highp float;

in vec2 vUV;
in vec4 vColor;
in vec4 vMaterial;

out vec4 fragColor;

uniform sampler2D uSampler;
uniform sampler2D uGradient;

void main(void){
#ifdef POINT
    vec4 color = texture(uSampler, gl_PointCoord);
#else
    vec4 color = texture(uSampler, vUV);
#endif
    fragColor = vec4(1.0,0.0,0.0,1.0);
}