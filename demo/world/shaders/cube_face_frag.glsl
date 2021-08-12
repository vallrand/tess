#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uSampler;
uniform vec4 uRegion;
uniform bool uInvert;

void main(){
    vec2 uv = vUV
    vec2 center = 0.5*(uRegion.xy + uRegion.zw);
    vec2 invHalf = 1.0/(0.5*(uRegion.zw - uRegion.xy));
    vec2 distance = (uv-center)*invHalf;

    if(uInvert && max(distance.x, distance.y) < 1.0) discard;
    else if(!uInvert && max(distance.x, distance.y) >= 1.0) discard;

    fragColor = texture(uSampler, uv);
}