#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec4 vColor;
in vec3 vDomain;
in float vMaterial;

out vec4 fragColor;

uniform sampler2D uSampler;

uniform GlobalUniforms {
    vec4 uTime;
};

void main(){
    float time = 1.6 * uTime.x + vDomain.x * 0.036;
    vec2 uv = vUV;
    float c0 = texture(uSampler, uv).r;
    float c1 = texture(uSampler, uv + vec2(0,-0.2*time)).g;
    float c2 = texture(uSampler, uv + vec2(0,-0.4*time)).b;
    float c = c1*c2;
    c = mix(smoothstep(0.2,0.8,c), c, c0*c0 * 0.8) * c0;
    vec4 color = mix(vec4(0), vec4(0.1,0.3,0.3,0.5), c*8.0);
    color = mix(color, vec4(0.4,0.6,0.7,0.2), smoothstep(0.0625,0.5,c));
    color = mix(color, vec4(1.0,1.0,1.0,0.0), smoothstep(0.125,0.75,c));
    
    fragColor = color * vColor;
}