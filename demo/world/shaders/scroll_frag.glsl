#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec4 vColor;
in vec3 vNormal;
in float vMaterial;

out vec4 fragColor;

uniform vec4 uUVTransform;
uniform sampler2D uSampler;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

void main(){
    vec2 uv = vUV;
    uv += vec2(0,-0.6*uTime.x) - uUVTransform.xy;
    vec4 color = texture(uSampler,uv);
    color *= smoothstep(.0,.2,1.-vUV.y);

#ifdef FRESNEL
    vec3 position = vPosition;
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(uEyePosition - position);
    float NdV = abs(dot(normal, view));
    color *= smoothstep(0.1,0.5,NdV);
#endif

    fragColor = color * vColor;
}