#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform vec4 uColor;

void main(){
    vec2 uv = vUV;
    fragColor = uColor;
}