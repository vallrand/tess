#version 300 es
precision highp float;

in vec2 vUV;
in vec3 vNormal;
in vec3 vPosition;

layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragPosition;

uniform sampler2D uDiffuseMap;

void main(void){
    vec4 diffuse = texture(uDiffuseMap, vUV);
    if(diffuse.a < 0.1) discard;
    fragPosition = vec4(vPosition,8);
    fragNormal = vec4(normalize(vNormal),0);
    fragAlbedo = vec4(diffuse.rgb,0.5);
}