#version 300 es
precision highp float;

in vec3 vPosition;
in mat4 vInvModel;
in vec4 vUV;
in vec4 vColor;
in float vThreshold;

uniform float uLayer;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform sampler2D uDiffuseMap;
uniform sampler2D uNormalMap;
uniform sampler2D uPositionBuffer;

layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;


#define TAU 6.283185307179586
float hash11(in float u){
    uint n = floatBitsToUint(u);
    n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & 0x7fffffffU)/float(0x7fffffff);
}
vec4 calcColor(in vec2 uv){
    uv = uv*2.-1.;
    const float rings = 6.0;
    vec2 polar = vec2(atan(uv.y,uv.x)/TAU+.5,length(uv));
    polar.y = pow(polar.y,0.8);
    
    float radius = floor(polar.y * rings)/rings;
    float r0 = hash11(floor(polar.y * rings));
    polar.x = fract(polar.x + uTime.x * mix(-0.2,0.2,r0));
    float r1 = hash11(floor(polar.x * (2.+8.*r0*radius)));
    polar.x = fract(polar.x - uTime.x * mix(-0.1,0.1,r1));
    float r2 = hash11(floor(polar.x * (2.+32.*r1*radius)));
    
    float l = fract(polar.y * rings);
    
    float alpha = smoothstep(1.0,0.8,l+.6*r1);
    alpha *= smoothstep(0.0,0.2,l-.2*r2);
    alpha *= step(1.0 / rings, radius) * step(polar.y,1.0);
    alpha *= step(.5+.5*sin(polar.x*TAU*(2.0+r1*8.0)),0.9);
    alpha = alpha + 4.0 * alpha * (1.0-alpha);
    
    vec3 color = alpha * mix(vec3(0.4,0.2,1), vec3(1,0.2,0.4), r0);
    return vec4(color, alpha);
}

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec3 viewRay = vPosition.xyz - uEyePosition;
    vec4 worldPosition = texelFetch(uPositionBuffer, fragCoord, 0);
    if(worldPosition.a > uLayer) discard;
    vec4 objectPosition = vInvModel * vec4(worldPosition.xyz, 1.0);
    if(0.5 < abs(objectPosition.x) || 0.5 < abs(objectPosition.y) || 0.5 < abs(objectPosition.z)) discard;
    vec2 uv = mix(vUV.xy, vUV.zw, objectPosition.xz + 0.5);

    vec4 color = vColor * calcColor(uv);
    fragAlbedo = color;
    fragNormal = vec4(0,0,0,smoothstep(0.8,1.6,color.a));
}