#version 300 es
precision highp float;

in vec3 vPosition;
#ifdef INSTANCED
in mat4 vModel;
in vec4 vUV;
in vec4 vColor;
in float vThreshold;
#else
#endif

layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;

uniform sampler2D uPositionBuffer;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform float uGridSize;

#define TAU 6.283185307179586
float grid(in vec2 uv, in float tiles, in float width){
    uv = cos(TAU*(uv*tiles));
    return smoothstep(1.0-width,1.0,max(uv.x,uv.y));
}

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 position = texelFetch(uPositionBuffer, fragCoord, 0);
    if(position.a > 1.0) discard;
    vec3 center = vec3(vModel[3]);
    vec2 uv = (position.xz + uEyePosition.xz - center.xz) * uGridSize;

    float fade = max(abs(uv.x), abs(uv.y));
    float grid1 = max(0.0,cos(TAU * (fade - 0.4 * uTime.x)));
    float grid0 = grid(position.xz + uEyePosition.xz,0.5,mix(0.01,0.1,grid1)) * smoothstep(1.0,0.8,fade);
    vec3 color = mix(vec3(0.6,0.9,0.8),vec3(0.8,1.0,1.0), grid1);

    fragAlbedo = vec4(color,grid0);
    fragNormal = vec4(0);
}