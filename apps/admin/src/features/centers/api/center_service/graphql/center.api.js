import axiosInstance from "../../../../../shared/api/http.js";

const GRAPHQL_ENDPOINT = "/graphql";

// -----------------------------------------------------------
// 1. MUTATIONS (Giữ nguyên logic mapping đã sửa trước đó)
// -----------------------------------------------------------

const CREATE_CENTER_MUTATION = `
  mutation CreateCenter(
    $name: String!,
    $address: String!,
    $phone: String!,
    $description: String,
    $totalCourts: Int,
    $facilities: [String],
    $googleMapUrl: String,
    $logoFileId: String,
    $imageFileIds: [String],
    $pricing: PricingInput,
    $centerManagerId: String
  ) {
    createCenter(
      name: $name,
      address: $address,
      phone: $phone,
      description: $description,
      totalCourts: $totalCourts,
      facilities: $facilities,
      googleMapUrl: $googleMapUrl,
      logoFileId: $logoFileId,
      imageFileIds: $imageFileIds,
      pricing: $pricing,
      centerManagerId: $centerManagerId
    ) {
      centerId
      name
    }
  }
`;

export const createCenterGQL = async (variables) => {
  const gqlVariables = {
    ...variables,
    imageFileIds: variables.imageFileIds || variables.image_file_ids,
    logoFileId: variables.logoFileId || variables.logo_file_id,
  };
  delete gqlVariables.image_file_ids;
  delete gqlVariables.logo_file_id;

  const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
    query: CREATE_CENTER_MUTATION,
    variables: gqlVariables,
  });
  if (response.data.errors) throw new Error(response.data.errors[0].message);
  return response.data.data.createCenter;
};

const UPDATE_CENTER_MUTATION = `
  mutation UpdateCenter($centerId: String!, $data: UpdateCenterInput!) {
    updateCenter(centerId: $centerId, data: $data) {
      centerId
      name
    }
  }
`;

export const updateCenterGQL = async (centerId, data) => {
  const gqlInputData = {
    name: data.name,
    address: data.address,
    phone: data.phone,
    description: data.description,
    totalCourts: data.totalCourts,
    facilities: data.facilities,
    googleMapUrl: data.googleMapUrl,
    isActive: data.isActive,
    pricing: data.pricing,
    centerManagerId: data.centerManagerId,
    logoFileId:
      data.logoFileId !== undefined ? data.logoFileId : data.logo_file_id,
    imageFileIds:
      data.imageFileIds !== undefined ? data.imageFileIds : data.image_file_ids,
  };

  Object.keys(gqlInputData).forEach(
    (key) => gqlInputData[key] === undefined && delete gqlInputData[key],
  );

  const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
    query: UPDATE_CENTER_MUTATION,
    variables: { centerId, data: gqlInputData },
  });
  if (response.data.errors) throw new Error(response.data.errors[0].message);
  return response.data.data.updateCenter;
};

// -----------------------------------------------------------
// 2. FRAGMENTS (PHẦN QUAN TRỌNG CẦN SỬA)
// -----------------------------------------------------------

// 👇 Bổ sung logoFileId và imageFileIds vào đây 👇
const CENTER_SUMMARY_FRAGMENT = `
  fragment CenterSummary on Center {
    centerId
    name
    address
    phone
    isActive
    centerManagerId
    avgRating
    totalCourts

    # Media
    logoUrl
    logoFileId
    imageUrlList
    imageFileIds

    # 👇 BỔ SUNG PHẦN NÀY ĐỂ getAllCenters TRẢ VỀ GIÁ 👇
    pricing {
      weekday { startTime endTime price }
      weekend { startTime endTime price }
    }
  }
`;

// Detail Fragment kế thừa Summary, nên nó cũng sẽ tự có các field trên
const CENTER_DETAIL_FRAGMENT = `
  fragment CenterDetail on Center {
    ...CenterSummary
    description
    facilities
    googleMapUrl
    bookingCount

    courts {
       courtId
       name
       type
       isActive
    }

    pricing {
      weekday { startTime endTime price }
      weekend { startTime endTime price }
    }
  }
  ${CENTER_SUMMARY_FRAGMENT}
`;

// -----------------------------------------------------------
// 3. QUERIES
// -----------------------------------------------------------

const GET_ALL_CENTERS_QUERY = `
  query GetCenters {
    centers {
      ...CenterSummary
    }
  }
  ${CENTER_SUMMARY_FRAGMENT}
`;

export const getAllCentersGQL = async () => {
  try {
    const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
      query: GET_ALL_CENTERS_QUERY,
    });

    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.centers;
  } catch (error) {
    console.error("Error fetching all centers via GraphQL:", error);
    throw error;
  }
};

const GET_CENTER_DETAIL_QUERY = `
  query GetCenterDetail($centerId: String!) {
    center(centerId: $centerId) {
      ...CenterDetail
    }
  }
  ${CENTER_DETAIL_FRAGMENT}
`;

export const getCenterInfoByIdGQL = async (centerId) => {
  try {
    const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
      query: GET_CENTER_DETAIL_QUERY,
      variables: { centerId },
    });

    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.center;
  } catch (error) {
    console.error(`Error fetching center info for ID ${centerId}:`, error);
    throw error;
  }
};

export const deleteCenterGQL = async (centerId) => {
  const query = `mutation Delete($id: String!) { deleteCenter(centerId: $id) }`;
  const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
    query,
    variables: { id: centerId },
  });
  if (response.data.errors) throw new Error(response.data.errors[0].message);
  return response.data.data.deleteCenter;
};
