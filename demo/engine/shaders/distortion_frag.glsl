#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec3 vNormal;
#ifndef MESH
in vec4 vColor;
in float vMaterial;
#endif

out vec4 fragColor;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

uniform sampler2D uAlbedoBuffer;
uniform sampler2D uSampler;

uniform float uDistortionStrength;
#ifdef PANNING
uniform vec4 uUVTransform;
uniform vec2 uUVPanning;
#endif
#ifdef VERTICAL_MASK
uniform vec4 uVerticalMask;
#endif
#ifdef HORIZONTAL_MASK
uniform vec4 uHorizontalMask;
#endif

void main(){
#ifdef PANNING
    vec2 uv0 = uUVTransform.xy + uUVTransform.zw * vUV;
    vec4 color = texture(uSampler,uv0 + uTime.x * uUVPanning);
#else
    vec4 color = texture(uSampler,vUV);
#endif

#ifdef VERTICAL_MASK
    color *= smoothstep(uVerticalMask.x,uVerticalMask.y,vUV.y);
    color *= smoothstep(uVerticalMask.w,uVerticalMask.z,vUV.y);
#endif
#ifdef HORIZONTAL_MASK
    color *= smoothstep(uHorizontalMask.x,uHorizontalMask.y,vUV.x);
    color *= smoothstep(uHorizontalMask.w,uHorizontalMask.z,vUV.x);
#endif

#ifdef MESH
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(uEyePosition - vPosition);
    float NdV = dot(normal, view);
    vec3 viewNormal = (uViewMatrix * vec4(normal, 0.0)).xyz;
    vec2 distortion = NdV * 0.1 * viewNormal.rg;
#else
    color *= vColor;
    float height = color.r;
    vec2 duvdx = dFdx(vUV);
    vec2 duvdy = dFdy(vUV);
    float dhdx = dFdx(height) / length(duvdx);
    float dhdy = dFdy(height) / length(duvdy);
    vec2 distortion = uDistortionStrength * color.a * vec2(dhdx, dhdy);
#endif
    vec2 uv = vec2(gl_FragCoord.xy) / vec2(textureSize(uAlbedoBuffer, 0));
    uv += distortion;
#ifdef CHROMATIC_ABERRATION
    float red = texture(uAlbedoBuffer, uv - vec2(.01*color.b,0)).r;
    vec4 diffuse = texture(uAlbedoBuffer, uv);
    float blue = texture(uAlbedoBuffer, uv + vec2(.01*color.b,0)).b;
    fragColor = vec4(red, diffuse.g, blue, diffuse.a);
#else
    fragColor = texture(uAlbedoBuffer, uv);
#endif
}