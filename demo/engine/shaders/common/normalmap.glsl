vec3 encodeNormal(in float height, in float alpha){
    float dhdx = dFdx(height);
    float dhdy = dFdy(height);
    vec3 normal = alpha * normalize(vec3(-dhdx, -dhdy, 1));
    return 0.5+0.5*normal;
}