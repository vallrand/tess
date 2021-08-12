#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

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
    float height = texture(uSampler, vUV).b;
    fragColor = vec4(calculateNormal(height / uScale), height);
}