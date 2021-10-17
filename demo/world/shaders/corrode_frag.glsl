#version 300 es
precision highp float;

in vec3 vPosition;
in mat4 vInvModel;
in vec4 vUV;
in vec4 vColor;
in float vThreshold;

layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

uniform float uLayer;
uniform sampler2D uDiffuseMap;
uniform sampler2D uNormalMap;
uniform sampler2D uPositionBuffer;

#pragma import(../../engine/shaders/common/noise.glsl)

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec3 viewRay = vPosition.xyz - uEyePosition;
    vec4 worldPosition = texelFetch(uPositionBuffer, fragCoord, 0);
    if(worldPosition.a > uLayer) discard;
    vec4 objectPosition = vInvModel * vec4(worldPosition.xyz, 1.0);
    if(0.5 < abs(objectPosition.x) || 0.5 < abs(objectPosition.y) || 0.5 < abs(objectPosition.z)) discard;
    vec2 uv = mix(vUV.xy, vUV.zw, objectPosition.xz + 0.5);
    ///vec4 color = vColor * texture(uDiffuseMap, uv);

    float f0 = noise3D(worldPosition.xyz-uTime.x*vec3(0,2,0));
    float f1 = noise3D(worldPosition.xyz * 1.6 + (f0*2.-1.) - uTime.x*vec3(0,1,0));

    vec4 color = vec4(0.1,0,0.1,0.8);
    color += vec4(0.4,0.8,0.6,0.8) * smoothstep(0.0,1.0,f0);
    color += vec4(0.5,1.0,1.0,1.0) * smoothstep(0.5,1.0,f1);
    color *= smoothstep(0.5,0.2,length(objectPosition.xyz));
    color.rgb = mix(color.grb, color.rgb, vColor.r);
    color *= vColor.a;


#ifdef ALPHA_CUTOFF
    if(color.a < ALPHA_CUTOFF) discard;
#endif
    fragAlbedo = color;
    fragNormal = vec4(0,0,0, smoothstep(0.5,1.0,color.a));
}