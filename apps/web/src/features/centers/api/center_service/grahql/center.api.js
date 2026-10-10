import axiosInstance from "../../../../../shared/api/http.js";

const GRAPHQL_ENDPOINT = "/graphql";

// -----------------------------------------------------------
// 💡 I. CÁC ĐỊNH NGHĨA FRAGMENT
// -----------------------------------------------------------

// Fragment cơ bản cho danh sách (tóm tắt)
const CENTER_SUMMARY_FRAGMENT = `
  fragment CenterSummary on Center {
    phone
    centerId
    name
    address
    logoUrl
    imageUrlList # 💡 THÊM: Cần lấy danh sách ảnh để chọn làm ảnh bìa (cover)
    totalCourts
    isActive
    centerManagerId
  }
`;

// Fragment cho thông tin chi tiết (dùng trong modal)
const CENTER_DETAIL_FRAGMENT = `
  fragment CenterDetail on Center {
    ...CenterSummary
    phone
    description
    googleMapUrl
    facilities
    bookingCount

    courts {
       courtId
       name
       type
       isActive
    }

    pricing {
      weekday {
        startTime
        endTime
        price
      }
      weekend {
        startTime
        endTime
        price
      }
    }
  }
  ${CENTER_SUMMARY_FRAGMENT}
`;

// -----------------------------------------------------------
// 💡 II. QUERIES VÀ FUNCTIONS
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

    if (response.data.errors) {
      console.error("GraphQL Errors:", response.data.errors);
      throw new Error(
        response.data.errors[0].message || "GraphQL query failed.",
      );
    }

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
      variables: {
        centerId: centerId,
      },
    });

    if (response.data.errors) {
      console.error("GraphQL Errors:", response.data.errors);
      throw new Error(
        response.data.errors[0].message || "GraphQL query failed.",
      );
    }

    return response.data.data.center;
  } catch (error) {
    console.error(
      `Error fetching center info for ID ${centerId} via GraphQL:`,
      error,
    );
    throw error;
  }
};
