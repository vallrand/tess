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
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform float uWeight;
uniform samplerCube uEnvironmentMap;
uniform sampler2D uBRDFLUT;

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness){
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 position = texelFetch(uPositionBuffer, fragCoord, 0);
    vec4 normal = texelFetch(uNormalBuffer, fragCoord, 0);
    vec4 albedo = texelFetch(uAlbedoBuffer, fragCoord, 0);

    float emission = max(0.,2.*albedo.a-1.);
    float roughness = clamp(2.*albedo.a,0.04,1.0);
    float metallic = normal.a;

    vec3 N = normalize(normal.xyz);
    vec3 V = normalize(position.xyz - uEyePosition);

    vec3 F0 = mix(vec3(0.04), albedo.rgb, metallic);
    float NdotV = max(dot(N, V), 0.0);

    vec3 F = fresnelSchlickRoughness(NdotV, F0, roughness);
    vec3 kD = (1.0 - F) * (1.0 - metallic);

#ifdef IRRADIANCE_MAP
    vec3 irradiance = texture(uIrradianceMap, N).rgb;
#else
    float blend = length(normal.xyz);
    vec3 light = mix(uGroundColor, uSkyColor, clamp(0.5 + 0.5 * dot(N, uLightDirection),0.,1.));
    light = mix(light, vec3(1), max(emission,1.-blend));
    vec3 irradiance = light;
#endif
    vec3 indirectDiffuse = irradiance * albedo.rgb;
#ifdef REFLECTION_MAP
    vec3 prefilteredColor = textureLod(uEnvironmentMap, reflect(V, N),  roughness * 8.0).rgb;   
    vec2 envBRDF  = texture(uBRDFLUT, vec2(NdotV, roughness)).rg;
    vec3 indirectSpecular = prefilteredColor * (F * envBRDF.x + envBRDF.y);
#else
    vec3 indirectSpecular = vec3(0);
#endif
    vec3 ambient = (kD * indirectDiffuse + indirectSpecular);

    fragColor = uWeight * vec4(ambient, emission);
}