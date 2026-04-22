import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Resolve proto dir relative to this source file so dev (tsx) and built (dist/) both work.
const here = dirname(fileURLToPath(import.meta.url));
const protoRoot = resolve(here, '../../proto');

const packageServiceDef = protoLoader.loadSync(
  'com/daml/ledger/api/v2/package_service.proto',
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true, includeDirs: [protoRoot] }
);
const packageManagementDef = protoLoader.loadSync(
  'com/daml/ledger/api/v2/admin/package_management_service.proto',
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true, includeDirs: [protoRoot] }
);

type PackageServiceClient = grpc.Client & {
  ListVettedPackages(
    req: ListVettedPackagesRequest,
    metadata: grpc.Metadata,
    cb: (err: grpc.ServiceError | null, res: ListVettedPackagesResponse) => void
  ): grpc.ClientUnaryCall;
};
type PackageManagementServiceClient = grpc.Client & {
  UpdateVettedPackages(
    req: UpdateVettedPackagesRequest,
    metadata: grpc.Metadata,
    cb: (err: grpc.ServiceError | null, res: UpdateVettedPackagesResponse) => void
  ): grpc.ClientUnaryCall;
};

const pkgProto = grpc.loadPackageDefinition(packageServiceDef) as unknown as {
  com: { daml: { ledger: { api: { v2: { PackageService: grpc.ServiceClientConstructor } } } } };
};
const adminProto = grpc.loadPackageDefinition(packageManagementDef) as unknown as {
  com: { daml: { ledger: { api: { v2: { admin: { PackageManagementService: grpc.ServiceClientConstructor } } } } } };
};

export type VettedPackage = {
  package_id: string;
  package_name: string;
  package_version: string;
};

export type VettedPackagesGroup = {
  packages: VettedPackage[];
  participant_id: string;
  synchronizer_id: string;
  topology_serial: number;
};

type ListVettedPackagesRequest = {
  package_metadata_filter?: {
    package_ids?: string[];
    package_name_prefixes?: string[];
  };
  topology_state_filter?: {
    participant_ids?: string[];
    synchronizer_ids?: string[];
  };
  page_token?: string;
  page_size?: number;
};

type ListVettedPackagesResponse = {
  vetted_packages: VettedPackagesGroup[];
  next_page_token: string;
};

export type VettedPackagesRef = {
  package_id: string;
  package_name: string;
  package_version: string;
};

type UpdateVettedPackagesRequest = {
  changes: Array<
    | { vet: { packages: VettedPackagesRef[] } }
    | { unvet: { packages: VettedPackagesRef[] } }
  >;
  dry_run?: boolean;
  synchronizer_id: string;
};

type UpdateVettedPackagesResponse = {
  past_vetted_packages?: VettedPackagesGroup;
  new_vetted_packages?: VettedPackagesGroup;
};

export type TopologyClientOptions = {
  address: string;
  synchronizerId: string;
  getToken: () => Promise<string>;
  useTls?: boolean;
};

export function createTopologyClient(opts: TopologyClientOptions) {
  const creds = opts.useTls === false ? grpc.credentials.createInsecure() : grpc.credentials.createSsl();

  const PackageServiceCtor = pkgProto.com.daml.ledger.api.v2.PackageService;
  const PackageManagementCtor = adminProto.com.daml.ledger.api.v2.admin.PackageManagementService;

  const packageClient = new PackageServiceCtor(opts.address, creds) as unknown as PackageServiceClient;
  const packageManagementClient = new PackageManagementCtor(opts.address, creds) as unknown as PackageManagementServiceClient;

  async function withAuth(): Promise<grpc.Metadata> {
    const token = await opts.getToken();
    const md = new grpc.Metadata();
    md.set('authorization', `Bearer ${token}`);
    return md;
  }

  function listVettedPackagesPage(req: ListVettedPackagesRequest): Promise<ListVettedPackagesResponse> {
    return withAuth().then(
      (md) =>
        new Promise((resolveP, rejectP) => {
          packageClient.ListVettedPackages(req, md, (err, res) => {
            if (err) rejectP(err);
            else resolveP(res);
          });
        })
    );
  }

  async function listVettedPackages(filter?: {
    packageIds?: string[];
    packageNamePrefixes?: string[];
    participantIds?: string[];
    synchronizerIds?: string[];
    pageSize?: number;
  }): Promise<VettedPackagesGroup[]> {
    const pageSize = Math.min(filter?.pageSize ?? 100, 100);
    const all: VettedPackagesGroup[] = [];
    let pageToken = '';
    do {
      const res = await listVettedPackagesPage({
        package_metadata_filter: (filter?.packageIds?.length || filter?.packageNamePrefixes?.length)
          ? { package_ids: filter.packageIds, package_name_prefixes: filter.packageNamePrefixes }
          : undefined,
        topology_state_filter: (filter?.participantIds?.length || filter?.synchronizerIds?.length)
          ? { participant_ids: filter.participantIds, synchronizer_ids: filter.synchronizerIds }
          : undefined,
        page_token: pageToken,
        page_size: pageSize,
      });
      all.push(...(res.vetted_packages ?? []));
      pageToken = res.next_page_token ?? '';
    } while (pageToken);
    return all;
  }

  async function updateVettedPackages(args: {
    vet?: VettedPackagesRef[];
    unvet?: VettedPackagesRef[];
    dryRun?: boolean;
    synchronizerId?: string;
  }): Promise<UpdateVettedPackagesResponse> {
    const changes: UpdateVettedPackagesRequest['changes'] = [];
    if (args.vet?.length) changes.push({ vet: { packages: args.vet } });
    if (args.unvet?.length) changes.push({ unvet: { packages: args.unvet } });
    if (!changes.length) throw new Error('updateVettedPackages: no vet or unvet operations provided');

    const md = await withAuth();
    return new Promise((resolveP, rejectP) => {
      packageManagementClient.UpdateVettedPackages(
        {
          changes,
          dry_run: args.dryRun ?? false,
          synchronizer_id: args.synchronizerId ?? opts.synchronizerId,
        },
        md,
        (err, res) => {
          if (err) rejectP(err);
          else resolveP(res);
        }
      );
    });
  }

  function close() {
    packageClient.close();
    packageManagementClient.close();
  }

  return { listVettedPackages, updateVettedPackages, close };
}

export type TopologyClient = ReturnType<typeof createTopologyClient>;
