#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec4 vColor;
in vec4 vMaterial;

layout(location=0) out vec4 fragColor;
layout(location=1) out vec4 fragNormal;

uniform sampler2D uSampler;
uniform vec2 uScreenSize;
uniform float uScale;

vec3 calculateNormal(in float height){
    float dhdx = dFdx(height) * uScreenSize.x;
    float dhdy = dFdy(height) * uScreenSize.y;
    vec3 normal = normalize(vec3(-dhdx, -dhdy, 1));
    return 0.5+0.5*normal;
}

void main(){
    fragColor = texture(uSampler, vUV);

    float height = fragColor.b;
    fragNormal = vec4(calculateNormal(height / uScale), height);
}