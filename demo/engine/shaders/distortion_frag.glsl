#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec4 vColor;
in vec3 vDomain;
in float vMaterial;

out vec4 fragColor;

uniform sampler2D uAlbedoBuffer;
uniform sampler2D uSampler;

void main(){
    vec4 color = vColor * texture(uSampler,vUV);
    float height = color.r;
    vec2 duvdx = dFdx(vUV);
    vec2 duvdy = dFdy(vUV);
    float dhdx = dFdx(height) / length(duvdx);
    float dhdy = dFdy(height) / length(duvdy);
    vec2 distortion = 0.01 * color.a * vec2(dhdx, dhdy);

    vec2 uv = vec2(gl_FragCoord.xy) / vec2(textureSize(uAlbedoBuffer, 0));
    uv += distortion;
    fragColor = texture(uAlbedoBuffer, uv);
}