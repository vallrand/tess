#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec3 vNormal;

#ifdef MESH
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
#else
in vec4 vColor;
in float vMaterial;
#endif

out vec4 fragColor;

uniform sampler2D uAlbedoBuffer;
uniform sampler2D uSampler;

void main(){
    vec4 color = texture(uSampler,vUV);
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
    vec2 distortion = 0.01 * color.a * vec2(dhdx, dhdy);
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