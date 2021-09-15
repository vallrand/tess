#version 300 es
precision highp float;

in vec2 vUV;
in vec3 vNormal;
in vec3 vPosition;

layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragPosition;

uniform sampler2D uSampler;

void main(void){
    vec2 uv = vUV;
    vec4 color = vec4(1.0,0.0,0.0,0.0);
    //texture(uSampler, uv);
    //color = vec4(1.0,1.0,1.0,smoothstep(0.5,0.0,abs(uv.x-0.5)));

    //if(color.a < 0.5) discard;

    fragPosition = vec4(vPosition, 8.0);
    fragNormal = vec4(normalize(vNormal),0.0);
    fragAlbedo = vec4(color.rgb,0.5);
}