import { ListPage, listMetadata, type LocaleProps } from '@/components/catalog/pages';

export function generateMetadata(props: LocaleProps) {
  return listMetadata('platos', props);
}

export default function Page(props: LocaleProps) {
  return <ListPage category="platos" params={props.params} />;
}
