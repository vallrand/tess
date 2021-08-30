#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec4 vColor;
in vec3 vNormal;
in float vMaterial;

out vec4 fragColor;

uniform sampler2D uSamplers[MAX_TEXTURE_UNITS];

void main(){
    int tex = int(vMaterial);
    vec2 uv = vUV;
    vec4 color = vec4(0);
    switch(tex){
#FOR        case #i:color=texture(uSamplers[#i],uv);break;
    }
    fragColor = color * vColor;
}