#version 300 es
precision highp float;

uniform sampler2D uAlbedoBuffer;
uniform sampler2D uNormalBuffer;
uniform sampler2D uPositionBuffer;

in vec2 vUV;

layout(location=0) out vec4 fragColor;

uniform LightUniforms {
    vec3 uLightDirection;
    vec3 uSkyColor;
    vec3 uGroundColor;
};

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec3 normal = texelFetch(uNormalBuffer, fragCoord, 0).xyz;
    float blend = length(normal);
    normal = normalize(normal);
    vec4 albedo = texelFetch(uAlbedoBuffer, fragCoord, 0);
    float emission = max(0.,2.*albedo.a-1.);

    vec3 light = mix(uGroundColor, uSkyColor, clamp(0.5 + 0.5 * dot(normal, uLightDirection),0.,1.));
    light = mix(light, vec3(1), max(emission,1.-blend));

    fragColor = vec4(light * albedo.rgb, emission);
}