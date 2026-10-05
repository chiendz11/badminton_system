// The upstream centre SDL stays public; federation to the retired centre subgraph is replaced by the Core REST adapter.
import {
  buildSchema,
  graphql,
  parse,
  type DocumentNode,
  type SelectionNode,
  Kind,
} from "graphql";
import type { RequestHandler, Request } from "express";
import { GatewayError } from "./middleware/http-errors";
import { centerTypeDefs } from "./modules/centers/center.schema";
import { CenterAdapter } from "./modules/centers/center-adapter";
function bounded(document: DocumentNode) {
  const fragments = new Map(
    document.definitions
      .filter((d) => d.kind === Kind.FRAGMENT_DEFINITION)
      .map((d) => [d.name.value, d]),
  );
  let fields = 0;
  const walk = (
    nodes: readonly SelectionNode[],
    depth: number,
    path = new Set<string>(),
  ): number => {
    if (depth > 12) throw new GatewayError(400, "GraphQL query quá sâu");
    let topFields = 0;
    for (const node of nodes) {
      if (++fields > 400) throw new GatewayError(400, "GraphQL query quá lớn");
      if (node.kind === Kind.FRAGMENT_SPREAD) {
        if (path.has(node.name.value))
          throw new GatewayError(400, "GraphQL fragment bị lặp");
        const fragment = fragments.get(node.name.value);
        if (fragment)
          topFields += walk(
            fragment.selectionSet.selections,
            depth,
            new Set([...path, node.name.value]),
          );
      } else if (node.kind === Kind.INLINE_FRAGMENT) {
        topFields += walk(node.selectionSet.selections, depth, path);
      } else {
        topFields++;
        if (node.selectionSet)
          walk(node.selectionSet.selections, depth + 1, path);
      }
    }
    return topFields;
  };
  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      const count = walk(definition.selectionSet.selections, 1);
      if (definition.operation === "mutation" && count > 1)
        throw new GatewayError(400, "Chỉ một mutation mỗi request");
    }
  }
}
export function graphqlMiddleware(centers: CenterAdapter): RequestHandler {
  const schema = buildSchema(centerTypeDefs);
  const root = {
    centers: (_args: any, req: Request) => centers.centers(req),
    center: ({ centerId }: any, req: Request) => centers.center(req, centerId),
    createCenter: (args: any, req: Request) => centers.create(req, args),
    updateCenter: ({ centerId, data }: any, req: Request) =>
      centers.update(req, centerId, data),
    deleteCenter: ({ centerId }: any, req: Request) =>
      centers.remove(req, centerId),
  };
  return async (req, res) => {
    if (typeof req.body?.query !== "string" || req.body.query.length > 40000)
      throw new GatewayError(400, "GraphQL query không hợp lệ");
    let document;
    try {
      document = parse(req.body.query);
    } catch {
      throw new GatewayError(400, "GraphQL query không hợp lệ");
    }
    bounded(document);
    const result = await graphql({
      schema,
      source: req.body.query,
      rootValue: root,
      contextValue: req,
      variableValues: req.body.variables,
      operationName: req.body.operationName,
    });
    if (result.errors)
      res.status(200).json({
        data: result.data,
        errors: result.errors.map((error) => ({
          message:
            error.originalError instanceof GatewayError
              ? error.originalError.message
              : error.message,
          extensions: {
            code:
              error.originalError instanceof GatewayError
                ? error.originalError.status
                : 400,
            requestId: req.requestId,
          },
        })),
      });
    else res.json(result);
  };
}
