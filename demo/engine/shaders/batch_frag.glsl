#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec4 vColor;
in vec4 vMaterial;

out vec4 fragColor;

uniform sampler2D uSamplers[MAX_TEXTURE_UNITS];

void main(){
    int tex = int(vMaterial.a);
    vec4 color = vec4(0);
    switch(tex){
#FOR        case #i:color=texture(uSamplers[#i],vUV);break;
    }
    color *= vColor;
    fragColor = vec4(color.rgb * color.a, color.a);
}