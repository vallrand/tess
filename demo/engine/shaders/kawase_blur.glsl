#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uSampler;
uniform vec2 uSize;

void main(){
    vec2 offset = (uSize + 0.5) / vec2(textureSize(uSampler, 0));
    vec4 color = vec4(0);
    color += texture(uSampler, vUV + offset * vec2(-1,+1));
    color += texture(uSampler, vUV + offset * vec2(+1,+1));
    color += texture(uSampler, vUV + offset * vec2(+1,-1));
    color += texture(uSampler, vUV + offset * vec2(-1,-1));
    fragColor = 0.25 * color;
}